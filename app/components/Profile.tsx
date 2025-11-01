// src/app/components/Profile.tsx

import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Button, Card, Col, Container, Form, Modal, Nav, Row } from 'react-bootstrap';
import { Facebook, Instagram, Link as LinkIcon, PencilSquare, PlusLg, Trash } from 'react-bootstrap-icons';

// ===============================================
// 1. IMPORTS FROM SHARED CONTEXT/TYPES
// ===============================================
import { auth, db, storage } from '@/app/lib/firebase'; 
import { 
    SocialLinks,
    Experience,
    Education,
    Skill,
    Project,
    ProfileData
} from '@/app/page'; 

// DUMMY IMPLEMENTATION FOR IMAGE GENERATORS (Needed for logic to compile)
const generateProfilePic = (name: string | null | undefined): string => {
    if (!name) return "https://via.placeholder.com/128/9CA3AF/FFF?text=Profile";
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `https://via.placeholder.com/128/9CA3AF/FFF?text=${initials}`;
}
const generateCoverPhoto = (name: string | null | undefined): string => {
    if (!name) return "https://via.placeholder.com/1000x200/D1D5DB/FFF?text=Cover+Photo";
    return `https://via.placeholder.com/1000x200/D1D5DB/FFF?text=Cover+Photo`;
}


const initialProfileData: ProfileData = {
  name: "Your Name Here",
  headline: "Job Title at Company | Company Name | Industry",
  location: "City, State, Country",
  about: "A passionate and experienced professional with a strong background in [Your Field]. I specialize in [Your Specialty] and am skilled in [Skill 1], [Skill 2], and [Skill 3]. I'm dedicated to [Your Professional Goal].",
  profileImageUrl: "https://via.placeholder.com/128/9CA3AF/FFF?text=Profile",
  coverImageUrl: "https://via.placeholder.com/1000x200/D1D5DB/FFF?text=Cover+Photo",
  socialLinks: {
    linkedin: "",
    facebook: "",
    instagram: "",
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

// ===============================================
// PROFILE COMPONENT (with corrected Firebase path)
// ===============================================

const Profile = () => {
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
  const [currentView, setCurrentView] = useState('about');
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<keyof ProfileData | 'profileInfo' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id'; // Define appId here

  const openModal = (section: keyof ProfileData | 'profileInfo') => setEditingSection(section);
  const closeModal = () => setEditingSection(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      // ✅ FIX: Use the consistent path for reading
      const userProfilePath = `artifacts/${appId}/users/${userId}/data/profile`;
      
      const unsubscribeSnapshot = onSnapshot(doc(db, userProfilePath), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data() as ProfileData;
          const updatedData = { ...userData };

          if (!userData.profileImageUrl && auth.currentUser) {
            updatedData.profileImageUrl = generateProfilePic(auth.currentUser.displayName);
          }
          if (!userData.coverImageUrl && auth.currentUser) {
            updatedData.coverImageUrl = generateCoverPhoto(auth.currentUser.displayName);
          }

          setProfileData(prevData => ({ ...prevData, ...updatedData }));
        } else {
          const defaultProfileImageUrl = auth.currentUser?.displayName ? generateProfilePic(auth.currentUser.displayName) : initialProfileData.profileImageUrl;
          const defaultCoverImageUrl = auth.currentUser?.displayName
            ? generateCoverPhoto(auth.currentUser.displayName) : initialProfileData.coverImageUrl;

          // Writing to the same path on initial load if data doesn't exist
          setDoc(doc(db, userProfilePath), {
              ...initialProfileData,
              profileImageUrl: defaultProfileImageUrl,
              coverImageUrl: defaultCoverImageUrl,
              name: auth.currentUser?.displayName || initialProfileData.name,
            }, { merge: true }) 
            .catch(e => console.error("Error creating initial profile:", e));
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching real-time data:", error);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [userId]);

  const handleSave = async (section: keyof ProfileData | 'profileInfo' | null, newData: any) => {
    if (!userId || !section) {
      console.error("User not authenticated or section is null.");
      return;
    }
    try {
      let dataToSave: any;
      if (section === 'profileInfo') {
        dataToSave = newData;
      } else if (section === 'about') {
        dataToSave = { about: newData };
      } else if (section === 'socialLinks') {
        dataToSave = { socialLinks: newData };
      } else {
        dataToSave = { [section]: newData };
      }
      
      // ✅ FIX: Use the consistent path for writing
      const userRef = doc(db, 'artifacts', appId, 'users', userId, 'data', 'profile');
      await setDoc(userRef, dataToSave, { merge: true });

      closeModal();
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    if (!userId) {
      console.error("User not authenticated.");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      try {
        const storageRef = ref(storage, `users/${userId}/${imageType}`);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);
        const updatedData = { [`${imageType}ImageUrl`]: imageUrl };
        
        // ✅ FIX: Use the consistent path for writing image URLs
        const userRef = doc(db, 'artifacts', appId, 'users', userId, 'data', 'profile');
        await setDoc(userRef, updatedData, { merge: true });

      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }
  };

  const EditProfileModal = () => {
    const [tempData, setTempData] = useState<any>(() => {
        if (!editingSection) return {};

        const data = profileData[editingSection as keyof ProfileData];
        if (Array.isArray(data)) {
            return [...(data as any)];
        }
        if (editingSection === 'profileInfo') {
            return {
                name: profileData.name,
                headline: profileData.headline,
                location: profileData.location
            }
        }
        if (editingSection === 'about') {
            return data; 
        }
        if (typeof data === 'object' && data !== null) {
            return { ...data };
        }
        return data;
    });

    const handleInputChange = (e: React.ChangeEvent<any>) => { 
        const { name, value } = e.target;
        setTempData((prev: any) => ({ ...prev, [name]: value }));
    };
    const handleListChange = (id: number, field: string, value: string) => {
      setTempData((prev: (Experience | Education | Skill | Project)[]) => 
        prev.map(item =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    };

    const handleAdd = () => {
      if (editingSection === 'experience') {
        setTempData((prev: Experience[]) => [...prev, { id: Date.now(), title: "", company: "", dates: "" }]);
      } else if (editingSection === 'education') {
        setTempData((prev: Education[]) => [...prev, { id: Date.now(), school: "", degree: "", dates: "" }]);
      } else if (editingSection === 'skills') {
        setTempData((prev: Skill[]) => [...prev, { id: Date.now(), name: "" }]);
      } else if (editingSection === 'projects') {
        setTempData((prev: Project[]) => [...prev, { id: Date.now(), title: "", description: "" }]);
      }
    };

    const handleDelete = (id: number) => {
      setTempData((prev: (Experience | Education | Skill | Project)[]) => prev.filter(item => item.id !== id));
    };

    const getFormContent = () => {
      switch (editingSection) {
        case 'profileInfo':
          return (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" name="name" value={tempData.name || ''} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Headline</Form.Label>
                <Form.Control type="text" name="headline" value={tempData.headline || ''} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control type="text" name="location" value={tempData.location || ''} onChange={handleInputChange} />
              </Form.Group>
            </Form>
          );
        case 'about':
          return (
            <Form.Group className="mb-3">
              <Form.Label>About</Form.Label>
              <Form.Control as="textarea" rows={4} value={tempData} onChange={(e) => setTempData(e.target.value)} />
            </Form.Group>
          );
        case 'socialLinks':
          return (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>LinkedIn URL</Form.Label>
                <Form.Control type="text" name="linkedin" value={tempData.linkedin || ''} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Facebook URL</Form.Label> 
                <Form.Control type="text" name="facebook" value={tempData.facebook || ''} onChange={handleInputChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Instagram URL</Form.Label>
                <Form.Control type="text" name="instagram" value={tempData.instagram || ''} onChange={handleInputChange} />
              </Form.Group>
            </Form>
          );
        case 'experience':
        case 'education':
        case 'skills':
        case 'projects':
          return (
            <>
              {Array.isArray(tempData) && tempData.map((item: any) => (
                <div key={item.id} className="mb-3 p-3 border rounded">
                  {editingSection === 'experience' && (
                    <>
                      <Form.Control className="mb-2" type="text" placeholder="Title" value={item.title} onChange={(e) => handleListChange(item.id, 'title', e.target.value)} />
                      <Form.Control className="mb-2" type="text" placeholder="Company" value={item.company} onChange={(e) => handleListChange(item.id, 'company', e.target.value)} />
                      <Form.Control className="mb-2" type="text" placeholder="Dates" value={item.dates} onChange={(e) => handleListChange(item.id, 'dates', e.target.value)} />
                    </>
                  )}
                  {editingSection === 'education' && (
                    <>
                      <Form.Control className="mb-2" type="text" placeholder="School" value={item.school} onChange={(e) => handleListChange(item.id, 'school', e.target.value)} />
                      <Form.Control className="mb-2" type="text" placeholder="Degree" value={item.degree} onChange={(e) => handleListChange(item.id, 'degree', e.target.value)} />
                      <Form.Control className="mb-2" type="text" placeholder="Dates" value={item.dates} onChange={(e) => handleListChange(item.id, 'dates', e.target.value)} />
                    </>
                  )}
                  {editingSection === 'skills' && (
                    <Form.Control type="text" placeholder="Skill Name" value={item.name} onChange={(e) => handleListChange(item.id, 'name', e.target.value)} />
                  )}
                  {editingSection === 'projects' && (
                    <>
                      <Form.Control className="mb-2" type="text" placeholder="Project Title" value={item.title} onChange={(e) => handleListChange(item.id, 'title', e.target.value)} />
                      <Form.Control className="mb-2" as="textarea" rows={3} placeholder="Project Description" value={item.description} onChange={(e) => handleListChange(item.id, 'description', e.target.value)} />
                    </>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)} className="mt-2"><Trash /></Button>
                </div>
              ))}
              <Button onClick={handleAdd} variant="secondary" className="mt-2"><PlusLg /> Add Item</Button>
            </>
          );
        default:
          return null;
      }
    };
    return (
      <Modal show={!!editingSection} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>{`Edit ${editingSection === 'profileInfo' ? 'Profile' : editingSection}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {getFormContent()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Close</Button>
          <Button variant="primary" onClick={() => handleSave(editingSection, tempData)}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    );
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Profile...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link active={currentView === 'about'} onClick={() => setCurrentView('about')}>About</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={currentView === 'edit'} onClick={() => setCurrentView('edit')}>Edit Profile</Nav.Link>
        </Nav.Item>
      </Nav>
      {currentView === 'about' && (
        <Row className="g-4 fade-in">
          <Col md={8}>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Img variant="top" src={profileData.coverImageUrl} style={{ height: '200px', objectFit: 'cover' }} />
        
              <div className="position-relative">
                <img
                  src={profileData.profileImageUrl}
                  alt="Profile"
                  className="rounded-circle border border-5 border-white position-absolute top-0 start-0 translate-middle ms-4"
                  style={{ width: '128px', height: '128px', objectFit: 'cover' }}
                />
                <div className="p-4 pt-5">
                  <h3 className="card-title fw-bold mt-3">{profileData.name}</h3>
                  <p className="text-muted mb-1">{profileData.headline}</p>
                  <p className="text-muted">{profileData.location}</p>
                </div>
              </div>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>About</Card.Title>
                <Card.Text>{profileData.about}</Card.Text>
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Projects</Card.Title>
                {profileData.projects.length > 0 ?
                (
                    profileData.projects.map((project) => (
                      <div key={project.id} className="mb-3">
                        <h5 className="fw-bold">{project.title}</h5>
                        <p className="text-muted">{project.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No projects added yet.</p>
                )}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Social Links</Card.Title>
                <div className="d-flex gap-3">
                  {profileData.socialLinks.linkedin && <a href={profileData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkIcon size={24} /></a>}
                  {profileData.socialLinks.facebook && <a href={profileData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={24} /></a>}
                  {profileData.socialLinks.instagram && <a href={profileData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={24} /></a>}
                </div>
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Experience</Card.Title>
                {profileData.experience.map((exp) => (
                  <div key={exp.id} className="mb-3">
                    <h5 className="fw-bold">{exp.title}</h5>
                    <p className="mb-0">{exp.company}</p>
                    <p className="text-muted">{exp.dates}</p>
                  </div>
                ))}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Education</Card.Title>
                {profileData.education.map((edu) => (
                  <div key={edu.id} className="mb-3">
                    <h5 className="fw-bold">{edu.school}</h5>
                    <p className="mb-0">{edu.degree}</p>
                    <p className="text-muted">{edu.dates}</p>
                  </div>
                ))}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Skills</Card.Title>
                <div className="d-flex flex-wrap gap-2">
                  {profileData.skills.map((skill) => (
                    <span key={skill.id} className="badge bg-secondary p-2">{skill.name}</span>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Analytics</Card.Title>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">4,321 profile views</li>
                  <li className="mb-2">543 post impressions</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      {currentView === 'edit' && (
    <Row className="g-4 fade-in">
        <Col md={8}>
            <Card className="mb-4 shadow-sm hover-effect">
                <div className="position-relative">
                    <Card.Img variant="top" src={profileData.coverImageUrl} style={{ height: '200px', objectFit: 'cover' }} />
                    <div className="position-absolute top-50 start-50 translate-middle">
                        <Button variant="light" className="position-relative overflow-hidden">
                            Upload Cover
                            {/* FIX: Using React.ChangeEvent<any> to resolve the type conflict */}
                            <Form.Control 
                                type="file" 
                                className="position-absolute top-0 start-0 w-100 h-100" 
                                style={{ opacity: 0, cursor: 'pointer' }} 
                                onChange={(e: React.ChangeEvent<any>) => handleImageUpload(e, 'cover')} 
                            />
                        </Button>
                    </div>
                </div>
                <div className="position-relative">
                    <img
                        src={profileData.profileImageUrl}
                        alt="Profile"
                        className="rounded-circle border border-5 border-white position-absolute top-0 start-0 translate-middle ms-4"
                        style={{ width: '128px', height: '128px', objectFit: 'cover' }}
                    />
                    <Button variant="light" className="rounded-circle position-absolute top-0 start-0 translate-middle ms-4 mt-5" style={{ width: '128px', height: '128px', opacity: 0, zIndex: 1, cursor: 'pointer' }}>
                        {/* FIX: Using React.ChangeEvent<any> to resolve the type conflict */}
                        <Form.Control 
                            type="file" 
                            className="w-100 h-100 position-absolute top-0 start-0" 
                            style={{ opacity: 0, cursor: 'pointer' }} 
                            onChange={(e: React.ChangeEvent<any>) => handleImageUpload(e, 'profile')} 
                        />
                    </Button>
                </div>
              <Card.Body>
                <div className="d-flex justify-content-end">
                  <Button variant="outline-secondary" onClick={() => openModal('profileInfo')}><PencilSquare /></Button>
                </div>
                <h3 className="card-title fw-bold mt-3">{profileData.name}</h3>
                <p className="text-muted mb-1">{profileData.headline}</p>
                <p className="text-muted">{profileData.location}</p>
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>About</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('about')}><PencilSquare /></Button>
                </div>
                <Card.Text>{profileData.about}</Card.Text>
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>Projects</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('projects')}><PencilSquare /></Button>
                </div>
                {profileData.projects.length > 0 ?
                (
                    profileData.projects.map((project) => (
                      <div key={project.id} className="mb-3">
                        <h5 className="fw-bold">{project.title}</h5>
                        <p className="text-muted">{project.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No projects added yet.</p>
                )}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>Social Links</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('socialLinks')}><PencilSquare /></Button>
                </div>
                <div className="d-flex gap-3">
                  {profileData.socialLinks.linkedin && <a href={profileData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkIcon size={24} /></a>}
                  {profileData.socialLinks.facebook && <a href={profileData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={24} /></a>}
                  {profileData.socialLinks.instagram && <a href={profileData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={24} /></a>}
                </div>
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>Experience</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('experience')}><PencilSquare /></Button>
                </div>
                {profileData.experience.map((exp) => (
                  <div key={exp.id} className="mb-3">
                    <h5 className="fw-bold">{exp.title}</h5>
                    <p className="mb-0">{exp.company}</p>
                    <p className="text-muted">{exp.dates}</p>
                  </div>
                ))}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>Education</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('education')}><PencilSquare /></Button>
                </div>
                {profileData.education.map((edu) => (
                  <div key={edu.id} className="mb-3">
                    <h5 className="fw-bold">{edu.school}</h5>
                    <p className="mb-0">{edu.degree}</p>
                    <p className="text-muted">{edu.dates}</p>
                  </div>
                ))}
              </Card.Body>
            </Card>
            <Card className="mb-4 shadow-sm hover-effect">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title>Skills</Card.Title>
                  <Button variant="outline-secondary" onClick={() => openModal('skills')}><PencilSquare /></Button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {profileData.skills.map((skill) => (
                    <span key={skill.id} className="badge bg-secondary p-2">{skill.name}</span>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="shadow-sm hover-effect">
              <Card.Body>
                <Card.Title>Analytics</Card.Title>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2">4,321 profile views</li>
                  <li className="mb-2">543 post impressions</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      <EditProfileModal />
    </Container>
  );
};

export default Profile;